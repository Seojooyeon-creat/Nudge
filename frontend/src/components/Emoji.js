// Renders an emoji as an OpenMoji illustration (hand-drawn color set) instead of
// the platform's native emoji font, so the door-sign emoji read as little
// drawings (그림체) rather than Apple glyphs.
//
// OpenMoji ships one PNG per emoji, named by its uppercase hex code points joined
// with "-" (and *excluding* the U+FE0F variation selector). We build that name
// from the grapheme and load the PNG straight off the jsDelivr CDN. If an emoji
// has no OpenMoji asset (or the network fails) we quietly fall back to rendering
// the original character as text, so nothing ever disappears.
import React, { useEffect, useState } from "react";
import { Image, Text } from "react-native";

const OPENMOJI_BASE =
  "https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@15.0.0/color/72x72/";

// Grapheme -> "2615" / "1F6AA" / "1F468-200D-1F4BB" (FE0F dropped to match OpenMoji).
function openmojiCode(text) {
  const parts = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === 0xfe0f) continue; // variation selector: OpenMoji omits it
    parts.push(cp.toString(16).toUpperCase());
  }
  return parts.join("-");
}

export default function Emoji({ char, size = 24, style }) {
  const [failed, setFailed] = useState(false);

  // Reset the fallback when the emoji itself changes (e.g. user edits a slot).
  useEffect(() => setFailed(false), [char]);

  if (!char) return null;

  const code = openmojiCode(char);
  if (failed || !code) {
    // Fall back to the native glyph so an emoji is never lost.
    return <Text style={[{ fontSize: size }, style]}>{char}</Text>;
  }

  return (
    <Image
      source={{ uri: `${OPENMOJI_BASE}${code}.png` }}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      onError={() => setFailed(true)}
      accessibilityLabel={char}
    />
  );
}
