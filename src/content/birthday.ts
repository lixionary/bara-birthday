import type defaults from "../../server/default-content.json";

export type Content = typeof defaults;
export let birthday: Content["birthday"];
export let copy: Content["copy"];
export let decorations: Content["decorations"];
export let settings: Content["settings"];

// Personalized content is installed only after server authentication.
// The seed above is a TYPE import, never bundled as browser data.
export function installContent(content: Content) {
  birthday = content.birthday;
  copy = content.copy;
  decorations = content.decorations;
  settings = content.settings;
}

export function stickerUrl(name: string) {
  return `/stickers/${name}.png`;
}
