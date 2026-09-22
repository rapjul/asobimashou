# Asobimashou! 遊びましょう! (Let's Play!)

### A minimal web app to practice reading Japanese Kana (Hiragana and Katakana) on the go

![Preview](assets/images/preview.png)
![GitHub Page](https://img.shields.io/github/actions/workflow/status/rapjul/asobimashou/pages-build-and-deploy.yaml?branch=update&logo=github&style=flat)

## Features

### Game Options

- Four bundled Japanese fonts plus system font choices; bundled fonts are cached for offline use after selection
- Light and dark theme, auto-detected from system settings
- Quiz Type: Hiragana, Katakana, or both
- Word Bank: JLPT N5-N4 by default, or the larger Random deck
- Round length: 20 cards by default, with shorter, longer, and Unlimited options
- Toggle: Dakuten (`ﾞ`) and Handakuten (`ﾟ`)
- Toggle: Doubled consonants (`っ`)
- Toggle: Combo Kana (`ゃ`, `ゅ`, `ょ`)
- Toggle: Small vowels (`ぁ`, `ぃ`, `ぅ`, `ぇ`, `ぉ`)
- Toggle: Vowel length (`ー`)
- Toggle: Showing Kanji

### Gameplay

- Correct and skipped words counter
- Time counter
- Keyboard shortcuts
- Mobile-first design
- Touch-friendly
- Clean and simple interface
- Play offline (PWA)
- Updates wait until the current round ends

### Results

- Correct answers counter
- Skipped words counter
- Total time counter
- Average time to answer
- Table with Romaji, English meaning, and link to [Jisho](https://jisho.org/)
- `Export CSV` button to download session results conforming to RFC 4180
- `Copy Table` button complete with Kanji, Kana, Romaji and English meaning
- `Share` button to copy your latest game statistics

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

## Running Locally & Development

Please refer to the comprehensive [Development Guide](./docs/DEVELOPMENT.md) for local installation, development server instructions, production builds, and test commands.

## Credits

This project is forked from [sglkc/asobimashou](https://github.com/sglkc/asobimashou).
