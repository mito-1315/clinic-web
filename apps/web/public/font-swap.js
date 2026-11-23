// Loads the Google Fonts stylesheet without blocking first paint. Lives in its own file because the
// site's Content-Security-Policy does not allow inline event handlers (onload="...").
document.querySelectorAll("link[data-font-swap]").forEach(function (l) {
  var on = function () { l.media = "all"; };
  if (l.sheet) on(); else l.addEventListener("load", on);
});
