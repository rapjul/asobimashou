#!/bin/bash
# generate-icons.sh - Cross-platform SVG to PNG icon generator for Asobimashou PWA.
#
# Usage:
#   ./scripts/generate-icons.sh ./assets/images/icons/favicon-flat-card-washi.svg

set -euo pipefail

# SCRIPT_DIR: The directory containing this script.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# ROOT_DIR: The repository root directory (parent of scripts/).
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Print usage instructions.
# Parameters:
#   None
usage() {
  echo "Usage: $0 <path_to_svg>"
  echo "Example: $0 ./assets/images/icons/favicon-flat-card-washi.svg"
}

# Convert an SVG file to a PNG file of a specific size using the best available tool.
# Parameters:
#   $1 - input_svg: Path to the input SVG file.
#   $2 - output_png: Path to the output PNG file.
#   $3 - size: The width/height of the square output PNG in pixels.
# Returns:
#   None
convert_svg() {
  local input_svg="$1"
  local output_png="$2"
  local size="$3"

  if command -v rsvg-convert &>/dev/null; then
    # librsvg tool, very fast and accurate.
    rsvg-convert -w "$size" -h "$size" "$input_svg" -o "$output_png"
  elif command -v magick &>/dev/null; then
    # ImageMagick's magick command (version 7 or newer).
    magick -background none -density 1000 "$input_svg" -resize "${size}x${size}" "$output_png"
  elif command -v convert &>/dev/null; then
    # ImageMagick's convert command (version 6 or older).
    convert -background none -density 1000 "$input_svg" -resize "${size}x${size}" "$output_png"
  elif command -v inkscape &>/dev/null; then
    # Inkscape command-line tool.
    inkscape --export-type=png -w "$size" -h "$size" "$input_svg" -o "$output_png"
  elif command -v sips &>/dev/null; then
    # macOS native scriptable image processing system (fallback, has some SVG rendering limitations such as no support for transparent backgrounds).
    sips -s format png -z "$size" "$size" "$input_svg" --out "$output_png" >/dev/null
  else
    # Error: No suitable converter found.
    echo "Error: No suitable SVG-to-PNG converter found."
    echo "Please install one of the following tools:"
    echo "  - Debian/Ubuntu: sudo apt install librsvg2-bin OR sudo apt install imagemagick"
    echo "  - macOS (Brew): brew install librsvg OR brew install imagemagick OR brew install --cask inkscape"
    echo "  - Windows: Install Inkscape or ImageMagick and ensure it is in your PATH"
    exit 1
  fi
}

# Download and install a font to the user's local font directory if it is not already installed.
# Parameters:
#   $1 - font_name: The display name of the font family (e.g. "Outfit").
#   $2 - font_file: The name of the TTF file to save it as (e.g. "Outfit-Variable.ttf").
#   $3 - download_url: The direct URL to download the TTF file.
# Returns:
#   None
ensure_font_available() {
  local font_name="$1"
  local font_file="$2"
  local download_url="$3"

  local installed=false

  # Check using fc-list if available.
  if command -v fc-list &>/dev/null; then
    if fc-list : family | grep -qi "$font_name"; then
      installed=true
    fi
  fi

  # Check standard user and system font directories directly.
  if [ "$installed" = false ]; then
    if [ -f "$HOME/Library/Fonts/$font_file" ] ||
      [ -f "/Library/Fonts/$font_file" ] ||
      [ -f "/System/Library/Fonts/$font_file" ] ||
      [ -f "$HOME/.local/share/fonts/$font_file" ] ||
      [ -f "$HOME/.fonts/$font_file" ] ||
      [ -f "/usr/share/fonts/$font_file" ] ||
      [ -f "/usr/local/share/fonts/$font_file" ]; then
      installed=true
    fi
  fi

  if [ "$installed" = true ]; then
    echo "✓ Font '$font_name' is already available on the system."
    return 0
  fi

  echo "Font '$font_name' is not installed. Installing to user font directory..."

  # Determine user font directory based on OS.
  local user_font_dir=""
  if [[ "$OSTYPE" == "darwin"* ]]; then
    user_font_dir="$HOME/Library/Fonts"
  else
    user_font_dir="$HOME/.local/share/fonts"
  fi

  # Ensure the directory exists.
  mkdir -p "$user_font_dir"

  # Download the font file.
  echo "Downloading $font_file..."
  if command -v curl &>/dev/null; then
    curl -L "$download_url" -o "$user_font_dir/$font_file"
  elif command -v wget &>/dev/null; then
    wget -O "$user_font_dir/$font_file" "$download_url"
  else
    echo "Warning: Neither curl nor wget is available. Cannot download font."
    return 1
  fi

  # Refresh fontconfig cache if fc-cache is available.
  if command -v fc-cache &>/dev/null; then
    echo "Refreshing font cache..."
    fc-cache -f "$user_font_dir" &>/dev/null || true
  fi

  echo "✓ Font '$font_name' installed successfully to $user_font_dir/$font_file"
}

# Scan the input SVG for references to font families and install them if they are missing.
# Parameters:
#   $1 - input_svg: Path to the input SVG file.
# Returns:
#   None
ensure_required_fonts() {
  local input_svg="$1"

  # Check if Outfit is referenced in the SVG.
  if grep -qi "Outfit" "$input_svg"; then
    ensure_font_available "Outfit" "Outfit-Variable.ttf" "https://github.com/google/fonts/raw/main/ofl/outfit/Outfit%5Bwght%5D.ttf"
  fi

  # Check if Klee One is referenced in the SVG.
  if grep -qi "Klee One" "$input_svg"; then
    ensure_font_available "Klee One" "KleeOne-SemiBold.ttf" "https://github.com/google/fonts/raw/main/ofl/kleeone/KleeOne-SemiBold.ttf"
  fi

  # Check if Noto Serif JP is referenced in the SVG.
  if grep -qi "Noto Serif JP" "$input_svg"; then
    ensure_font_available "Noto Serif JP" "NotoSerifJP-Bold.ttf" "https://github.com/google/fonts/raw/main/ofl/notoserifjp/NotoSerifJP%5Bwght%5D.ttf"
  fi

  # Check if Noto Sans JP is referenced in the SVG.
  if grep -qi "Noto Sans JP" "$input_svg"; then
    ensure_font_available "Noto Sans JP" "NotoSansJP-Variable.ttf" "https://github.com/google/fonts/raw/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf"
  fi

  # Check if Yuji Syuku is referenced in the SVG.
  if grep -qi "Yuji Syuku" "$input_svg"; then
    ensure_font_available "Yuji Syuku" "YujiSyuku-Regular.ttf" "https://github.com/google/fonts/raw/main/ofl/yujisyuku/YujiSyuku-Regular.ttf"
  fi
}

# Main execution function.
# Parameters:
#   $@ - Command-line arguments.
# Returns:
#   None
main() {
  if [ "$#" -lt 1 ]; then
    usage
    exit 1
  fi

  local input_svg="$1"

  # Check if the file exists before resolving.
  if [ ! -f "$input_svg" ]; then
    echo "Error: File '$input_svg' not found."
    exit 1
  fi

  # Resolve the input SVG path to an absolute path.
  if [[ "$input_svg" != /* ]]; then
    input_svg="$(pwd)/$input_svg"
  fi

  # Change working directory to the repository root.
  cd "$ROOT_DIR"

  # Ensure target directories exist.
  mkdir -p assets/images/icons

  # Ensure required fonts are installed.
  ensure_required_fonts "$input_svg"

  echo "Generating icons using input: $input_svg..."

  # 1. Copy SVG to root as favicon.svg
  cp "$input_svg" favicon.svg
  echo "✓ Copied to favicon.svg"

  # 2. Render PWA PNGs to assets/images/icons/
  echo "Rendering assets/images/icons/icon-192.png (192x192)..."
  convert_svg "$input_svg" "assets/images/icons/icon-192.png" 192
  echo "✓ Rendered assets/images/icons/icon-192.png"

  echo "Rendering assets/images/icons/icon-512.png (512x512)..."
  convert_svg "$input_svg" "assets/images/icons/icon-512.png" 512
  echo "✓ Rendered assets/images/icons/icon-512.png"

  # 3. Render apple-touch-icon.png to the root
  echo "Rendering apple-touch-icon.png (180x180)..."
  convert_svg "$input_svg" "apple-touch-icon.png" 180
  echo "✓ Rendered apple-touch-icon.png"

  echo "All icons generated successfully!"
}

main "$@"
