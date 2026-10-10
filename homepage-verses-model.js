(function(root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.churchHomepageVersesModel = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
  "use strict";
  const MAX_HOMEPAGE_VERSES_BYTES = 196608, MAX_QUOTATION_LENGTH = 320;
  const dateValid = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T12:00:00Z")) && (new Date(s + "T12:00:00Z")).toISOString().slice(0, 10) === s;
  // Use the parish local calendar date, including BST, rather than UTC midnight.
  const londonDate = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  function monday(now = new Date()) {
    const day = londonDate(now), d = new Date(day + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
    return d.toISOString().slice(0, 10);
  }
  function warning(verse) {
    return typeof verse?.quotation === "string" && verse.quotation.length > 160 ? "This quotation is quite long for the hero. Preview it at phone and desktop widths before publishing." : "";
  }
  function validateHomepageVerses(data) {
    if (!data || Array.isArray(data) || data.schemaVersion !== 1 || Object.keys(data).some((k) => !["schemaVersion", "verses"].includes(k)) || !Array.isArray(data.verses) || data.verses.length > 260) throw new Error("Invalid Bible verse schedule.");
    if (new TextEncoder().encode(JSON.stringify(data, null, 2) + "\n").byteLength > MAX_HOMEPAGE_VERSES_BYTES) throw new Error("The Bible verse schedule is too large.");
    const ids = new Set(), published = [];
    for (const v of data.verses) {
      if (!v || Array.isArray(v) || Object.keys(v).some((k) => !["id", "reference", "translation", "quotation", "startDate", "endDate", "published", "note", "createdAt", "updatedAt"].includes(k))) throw new Error("Invalid Bible verse entry.");
      if (typeof v.id !== "string" || !/^[-a-z0-9]{1,80}$/.test(v.id) || ids.has(v.id)) throw new Error("Each verse needs a unique identifier.");
      ids.add(v.id);
      for (const [key, limit] of [["reference", 120], ["translation", 32], ["quotation", MAX_QUOTATION_LENGTH], ["note", 500]]) if (typeof v[key] !== "string" || v[key].length > limit || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v[key])) throw new Error(key === "quotation" ? "Keep quotation text within 320 characters, without HTML." : "Please use plain text within the field limits.");
      if (typeof v.published !== "boolean") throw new Error("Choose Published or Draft.");
      for (const key of ["createdAt", "updatedAt"]) if (v[key] !== void 0 && (typeof v[key] !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v[key]) || Number.isNaN(Date.parse(v[key])))) throw new Error("Invalid update date.");
      if (!["startDate", "endDate"].every((k) => typeof v[k] === "string" && (v[k] === "" || dateValid(v[k])))) throw new Error("Enter valid schedule dates.");
      if (v.startDate || v.endDate) {
        if (!dateValid(v.startDate) || !dateValid(v.endDate) || (new Date(v.startDate + "T12:00:00Z")).getUTCDay() !== 1 || Date.parse(v.endDate) - Date.parse(v.startDate) !== 6 * 864e5) throw new Error("Choose a Monday start and the following Sunday end.");
      }
      if (v.published) {
        if (!v.reference.trim() || !v.translation.trim() || !v.quotation.trim() || !v.startDate) throw new Error("Published verses need a reference, translation, quotation and scheduled week.");
        published.push(v);
      }
    }
    published.sort((a, b) => a.startDate.localeCompare(b.startDate));
    for (let i = 1; i < published.length; i++) if (published[i].startDate <= published[i - 1].endDate) throw new Error("Two published verses overlap. Set one to Draft or choose another week.");
    return data;
  }
  function selectVerse(data, now = new Date()) {
    try {
      validateHomepageVerses(data);
      const day = londonDate(now);
      return data.verses.find((v) => v.published && v.startDate <= day && day <= v.endDate) || null;
    } catch {
      return null;
    }
  }
  return { MAX_HOMEPAGE_VERSES_BYTES, MAX_QUOTATION_LENGTH, dateValid, londonDate, monday, warning, validateHomepageVerses, selectVerse };
});
