param([Parameter(Mandatory=$true)][ValidatePattern('^[a-f0-9]{40}$')][string]$ExpectedRevision)
$ErrorActionPreference='Stop'
# Owner-operated Cloud Shell bootstrap only. Never print the storage setting,
# pass it on the command line, or write it into the repository or shell history.
$adminAppName='stmichael-church-admin-api'
$adminResourceGroup='rg-stmichael-church-admin'
$previousStorage=$env:AzureWebJobsStorage
$previousCliStorage=$env:AZURE_STORAGE_CONNECTION_STRING
try{
    $checkedOutRevision=git -C "$PSScriptRoot/../.." rev-parse HEAD
    if($LASTEXITCODE -ne 0 -or $checkedOutRevision.Trim() -ne $ExpectedRevision){throw 'Checkout does not match the requested release.'}
    $accessMode=az functionapp config appsettings list --name $adminAppName --resource-group $adminResourceGroup --query "[?name=='ADMIN_ACCESS_MODE'].value | [0]" -o tsv --only-show-errors
    if($LASTEXITCODE -ne 0){throw 'Could not verify enforcement mode.'}
    if($accessMode -and $accessMode -ne 'legacy'){throw 'Bootstrap is unavailable after enforcement is enabled.'}
    Write-Host 'In the signed-in Admin page, open Administrator access setup and choose Copy verified owner setup.'
    Write-Host 'Paste the single copied line into the hidden prompt. Do not paste a token or share the JSON in chat.'
    $privateInput=Read-Host 'Verified owner JSON' -AsSecureString
    $env:ACCESS_VERIFIED_OWNER_IDENTITY=[System.Net.NetworkCredential]::new('',$privateInput).Password
    $env:ACCESS_OWNER_ACCOUNT=Read-Host 'Owner Microsoft account email (display label only)'
    $env:ACCESS_EXPECTED_REVISION=$ExpectedRevision
    $env:ADMIN_ACCESS_MODE='legacy'
    # Validate live verification BEFORE any Azure write.
    $verification=$env:ACCESS_VERIFIED_OWNER_IDENTITY|ConvertFrom-Json
    if($verification.administrator -ne $true -or $verification.authorizationStatus -ne 'http-200' -or $verification.authorizationBuild.revision -ne $ExpectedRevision){throw 'The signed-in owner check must succeed on this release before bootstrap.'}
    node "$PSScriptRoot/bootstrap-access.cjs" --check
    if($LASTEXITCODE -ne 0){throw 'Verified identity does not match the existing owner policy. No Azure writes attempted.'}
    $env:AzureWebJobsStorage=az functionapp config appsettings list --name $adminAppName --resource-group $adminResourceGroup --query "[?name=='AzureWebJobsStorage'].value | [0]" -o tsv --only-show-errors
    if($LASTEXITCODE -ne 0 -or -not $env:AzureWebJobsStorage){throw 'Storage configuration is unavailable.'}
    if($env:AzureWebJobsStorage -notmatch '(?:^|;)AccountName=rgstmichaelchurchad85df(?:;|$)'){throw 'Storage account differs from the verified Dev account.'}
    $env:AZURE_STORAGE_CONNECTION_STRING=$env:AzureWebJobsStorage
    $metadata=az storage account show --name rgstmichaelchurchad85df --resource-group $adminResourceGroup --query '{allowBlobPublicAccess:allowBlobPublicAccess}' -o json --only-show-errors|ConvertFrom-Json
    if($LASTEXITCODE -ne 0 -or $metadata.allowBlobPublicAccess -ne $false){throw 'Account-level public access must remain disabled.'}
    az storage container create --name church-website-access --public-access off --only-show-errors -o none
    if($LASTEXITCODE -ne 0){throw 'Could not provision the private access container. No RBAC changes attempted.'}
    node "$PSScriptRoot/bootstrap-access.cjs"
    if($LASTEXITCODE -ne 0){throw 'Owner bootstrap did not complete. Do not enable section enforcement.'}
    Write-Host 'Now use Verify private owner setup in the signed-in Admin page. Do not enable enforcement yet.'
}catch{
    throw 'Private owner setup did not complete. Do not enable enforcement. No credentials displayed.'
}finally{
    $env:AzureWebJobsStorage=$previousStorage
    $env:AZURE_STORAGE_CONNECTION_STRING=$previousCliStorage
    foreach($name in @('ACCESS_VERIFIED_OWNER_IDENTITY','ACCESS_OWNER_ACCOUNT','ACCESS_EXPECTED_REVISION','ADMIN_ACCESS_MODE')){Remove-Item "Env:$name" -ErrorAction SilentlyContinue}
}
