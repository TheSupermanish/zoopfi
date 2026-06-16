#!/usr/bin/env bash
# Rebuild the Zoopfi privacy engine (forked from NethermindEth/stellar-private-payments)
# and copy its WASM + circuit artifacts into public/ where Zoopfi loads them.
#
# The engine source lives outside this repo (it is a large multi-crate Rust/WASM
# workspace). Point PRIVACY_ENGINE_SRC at a checkout, then run this script.
#
# Prereqs (macOS): `brew install llvm` (wasm-capable clang for sqlite-wasm-rs),
# `rustup target add wasm32-unknown-unknown`, `cargo install trunk`, node/npm.
set -euo pipefail

SRC="${PRIVACY_ENGINE_SRC:-/tmp/spp}"
DEST="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

[ -d "$SRC" ] || { echo "PRIVACY_ENGINE_SRC not found: $SRC" >&2; exit 1; }

echo "==> building engine dist in $SRC"
( cd "$SRC" && \
  CC_wasm32_unknown_unknown=/opt/homebrew/opt/llvm/bin/clang \
  AR_wasm32_unknown_unknown=/opt/homebrew/opt/llvm/bin/llvm-ar \
  PATH="/opt/homebrew/opt/llvm/bin:$PATH" \
  make build RELEASE=1 )

echo "==> copying artifacts into public/"
mkdir -p "$DEST/public/js" "$DEST/public/circuits" "$DEST/public/privacy-legal"
cp "$SRC"/dist/js/web.js "$SRC"/dist/js/web_bg.wasm "$DEST/public/js/"
cp "$SRC"/dist/js/prover-worker.js "$SRC"/dist/js/prover-worker_bg.wasm "$DEST/public/js/"
cp "$SRC"/dist/js/storage-worker.js "$SRC"/dist/js/storage-worker_bg.wasm "$DEST/public/js/"
cp "$SRC"/dist/circuits/*.r1cs "$SRC"/dist/circuits/*.wasm "$DEST/public/circuits/"
cp "$SRC"/dist/circuits/source-bundle.tar.gz "$DEST/public/circuits/" 2>/dev/null || true
cp "$SRC"/dist/{LICENSE.txt,NOTICE.txt,DISCLAIMER.txt} "$DEST/public/privacy-legal/" 2>/dev/null || true
cp -r "$SRC"/dist/licenses "$DEST/public/privacy-legal/" 2>/dev/null || true

echo "==> done. Engine deployment addresses are baked from \$SRC/deployments/testnet/deployments.json"
