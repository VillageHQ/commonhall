// Runs in <head>, before the first paint. It sets the theme (the ?theme= link, then the visitor's saved choice, then the
// system setting) so the page never flashes the wrong one, and adds html.js. Motion needs no class: site.js reads the
// reduced-motion setting itself, and without JavaScript the page is still and complete.
(function () {
  var root = document.documentElement;
  root.classList.add("js");
  var theme = null;
  try {
    var asked = new URLSearchParams(location.search).get("theme");
    if (asked === "light" || asked === "dark") theme = asked;
    else {
      var saved = localStorage.getItem("ch-theme");
      if (saved === "light" || saved === "dark") theme = saved;
    }
  } catch (e) {}
  if (!theme) theme = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  root.setAttribute("data-theme", theme);
})();
