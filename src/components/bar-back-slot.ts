// Where the phone's top bar takes a pushed screen's back button (back-link.tsx): its first child, so the button comes
// first in the keyboard order too (before "Your menu"). The shell renders the slot (app-shell.tsx). A plain module, so
// the server's shell and the client's link read the same string.
export const BAR_BACK_SLOT = "bar-back";
