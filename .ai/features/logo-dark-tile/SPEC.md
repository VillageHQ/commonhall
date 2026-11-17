# The logo tile's dark backdrop

An uploaded logo that is light on transparent gets the dark tile (`--logo-backdrop-dark`), chosen on upload by
`src/modules/admin/components/logo-upload.ts`. On that tile the logo sits inside a pixel inset, a tenth of the tile
(3 px in the 30 and 34 px tiles, 4 px in the 44 px one), so it always fills the tile. The light tile has no inset.
A Logo URL always uses the light tile (an open item in the onboarding list).
