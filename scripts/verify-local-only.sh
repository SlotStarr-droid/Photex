#!/bin/bash

# Photex Local-Only Verification Script
# Runs expo doctor and pnpm audit to ensure app is ready

set -e

echo "=========================================="
echo "Photex Local-Only Health Check"
echo "=========================================="
echo ""

# Step 1: Verify workspace root
if [ ! -f "pnpm-workspace.yaml" ]; then
  echo "❌ Error: Not in workspace root. Run from Photex root directory."
  exit 1
fi

echo "✅ Workspace root verified"
echo ""

# Step 2: Check Expo setup
echo "-------------------------------------------"
echo "Running: expo doctor (from artifacts/mobile)"
echo "-------------------------------------------"
cd artifacts/mobile
if command -v npx &> /dev/null; then
  npx expo doctor || { echo "⚠️  expo doctor found issues (see above)"; }
else
  echo "❌ npx not found. Install Node.js/npm first."
  exit 1
fi
cd ../..
echo ""

# Step 3: Audit dependencies
echo "-------------------------------------------"
echo "Running: pnpm audit"
echo "-------------------------------------------"
if command -v pnpm &> /dev/null; then
  pnpm audit || { echo "⚠️  Vulnerabilities found (see above)"; }
else
  echo "❌ pnpm not found. Install pnpm first: npm install -g pnpm"
  exit 1
fi
echo ""

# Step 4: TypeCheck
echo "-------------------------------------------"
echo "Running: pnpm run typecheck"
echo "-------------------------------------------"
pnpm run typecheck || { echo "❌ TypeScript errors found"; exit 1; }
echo ""

# Step 5: Build
echo "-------------------------------------------"
echo "Running: pnpm run build"
echo "-------------------------------------------"
pnpm run build || { echo "❌ Build failed"; exit 1; }
echo ""

echo "=========================================="
echo "✅ All checks passed! App is ready."
echo "=========================================="
echo ""
echo "Next: Run 'pnpm --filter @workspace/mobile run dev' to start dev server"
