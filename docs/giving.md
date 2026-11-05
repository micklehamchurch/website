# Giving: restored owner-confirmed information

Starting Dev: f49bfce8d4f19e4604b1d6c03bdd9c8c649184b1. Main: 804a189ae8b09e8a88f4bb98947af0e9fcb34c30.

The website owner explicitly confirmed that all information on the old Giving and Methods of Giving pages is accurate and current. This supersedes earlier migration cautions about the postal address and practical arrangements. Sources: https://www.micklehamchurch.org.uk/giving.htm and https://www.micklehamchurch.org.uk/methodsofgiving.htm, supplied screenshots and owner confirmation.

## Audit and restoration

- Why we give: retain the existing parish-support introduction and purpose cards; restore Christian gratitude, following Jesus, caring for people in need, joyful generosity, time/talents/resources and the Church at the heart of the community.
- PGS: retain Direct Debit and predictable giving; restore optional annual inflation increases, flexible management and prompt Gift Aid recovery/cash-flow benefits. Restore the old source's official information destination, https://www.parishgiving.org.uk/home/. This is information, not an invented parish enrolment/payment page.
- Standing Orders: retain the bank card and one-off transfers; explain online banking/bank contact, amount/dates and changing/cancelling instructions.
- Payaz: restore the location to the right on entering church, card/phone use and eligible Gift Aid at the terminal.
- Cash/cheques: retain the wall safe and exact cheque payee; restore the owner-confirmed postal instructions.
- Gift Aid: restore yellow Free Will Offering envelopes at both Church and Chapel, completion and offering-plate instructions. Explain the declaration, 25p per pound and sufficient UK Income Tax/Capital Gains Tax to cover claims across donations. Cross-checked against https://www.gov.uk/donating-to-charity/gift-aid.
- Legacy: retain the welcoming future-generations invitation; restore gifts of shares, gratitude, charity inheritance-tax exemption and deduction before calculating estate tax. Refer donors to their solicitor/financial adviser. Cross-checked against https://www.gov.uk/inheritance-tax/gifts and https://www.gov.uk/donating-to-charity/leaving-gifts-to-charity-in-your-will.

## Exact financial instructions

NatWest; account name Mickleham PCC; sort code 60-07-02; account number 31547257. The bank card is byte-identical to starting Dev.

Cheques payable to Mickleham Church PCC (deliberately distinct from the bank account name). Post to Treasurer c/o The Rectory, Old London Road, Mickleham, Surrey RH5 6EB. This donation address is not replaced with the church's different visitor postcode.

The Parochial Church Council of the Ecclesiastical Parish of Mickleham; Registered Charity No. 1128482. Existing charity wording and number preserved.

## Richard Siberry

Published Treasurer record in _content/contacts.json and the existing Our Team page agree: Richard Siberry, pcctreasurer@micklehamchurch.org.uk, 01372 375303. All eight enquiry actions use that exact mailto, including PGS, bank giving, Payaz, cheque, Gift Aid, legacy/shares and general enquiries. The existing security card gives his name, role, email and phone. General parish contacts elsewhere are unchanged. No role/address is invented; no email was sent during testing.

No PCC reconfirmation is outstanding for these arrangements given the owner's confirmation. No online payment processing is introduced.

## Design and delivery

Keep the existing hero, genuine images, green/ivory palette, typography, four main cards, two assurance cards, legacy, charity and thanks sections, shared header/footer and responsive breakpoints. Content expands naturally. Page-specific CSS keeps both introductory paragraphs in the existing muted colour and allows the verified email to wrap within narrow cards; no shared styling/runtime JavaScript changes. Search is regenerated only for Giving. Historical preservation assertions are updated narrowly where needed; independent tests protect exact financial/contact details and unaffected markup/systems.

PGS optional inflation-linked giving and Gift Aid processing are also corroborated by the Church of England: https://www.churchofengland.org/resources/building-generous-church/enabling-giving/giving-mechanisms/direct-debits
