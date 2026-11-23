# Official mascot art (web copies)

Small copies for the website and emails. The full-size originals live in
[SpinHobby/official-assets](https://github.com/SpinHobby/official-assets) (`mascot/`). Change art there first, then remake
these copies; never edit them by hand.

| File | Original | Used for |
| --- | --- | --- |
| mascot-full.png | mascot/mascot.png (5400×7200), 580×800 | About page |
| mascot-wave.png | mascot/frui2par10r/IMG_8515.PNG (1136×1142, white background), 520 wide | welcome email (top) |
| clover.png | mascot/AidiChibi/IMG_0211.png, trimmed, 480 wide | empty search, empty cart, shipped email |
| clover-good-luck.png | mascot/AidiChibi/IMG_0212.png, trimmed, 480 wide | welcome email sign-off |
| clover-thank-you.png | mascot/AidiChibi/IMG_0213.png, trimmed, 480 wide | order confirmed page and email |
| line-head.png | mascot/frui2par10r/448849c4-0b95-4649-ba6f-9e5c99d54d1b.jpg (2048×2042), the square 336,0 to 1776,1440, 700×700 | price tags (label printer) |

mascot-wave.png: the white background was removed by filling in from the edges (the drawing's outlines stop it), so a few
tiny white slivers between hair strands on the right remain. sparkle.png, sparkle-small.png, heart-pink.png, heart-red.png: the little doodles cut out of mascot/AidiChibi/IMG_0211.png
(only the main shape kept, 64 px tall). Emails use them as bullets and dividers instead of emoji.

The clover copies have near-invisible stray pixels (alpha under 40) cleared before trimming. Code refers to them through
`src/v3/mascots.ts`.

Only official, artist-drawn art goes here. No AI-generated pictures: anime fans and artists dislike them.

line-head.png: black lines on transparent (alpha = 255 minus the drawing's grey, greys under 24 cleared as JPEG noise). Before
scaling down, every line except the eyes was widened by 2 px at full size (a 5 px max filter; the eyes, two ellipses centred at
655,735 and 987,685 in the crop with radii 100×90 and 108×90, blurred 12 px, keep the drawn lines), so the label printer's
black-or-white print doesn't break the thin hair and clothes lines. Nothing was redrawn.
