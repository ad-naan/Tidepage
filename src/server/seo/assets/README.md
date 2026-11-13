# Share image font

`noto-serif-sc-500.woff` is a static 500-weight instance of Noto Serif SC,
converted with FontTools from `NotoSerifSC-VF.ttf`. It retains Latin,
general and CJK punctuation, CJK Extension A, unified ideographs, and fullwidth forms.
The original SIL Open Font License is included in `OFL.txt`.

The share-image renderer reads this server-only file at runtime. Next.js traces
the literal path into the standalone build; browsers do not download it. A local
WOFF keeps Chinese titles consistent with the site's editorial typography and
does not depend on an external font service.
