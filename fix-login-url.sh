#!/bin/bash
# Fix all window.location.href = getLoginUrl() calls

files=(
  "client/src/components/DashboardLayout.tsx"
  "client/src/pages/Dashboard.tsx"
  "client/src/pages/CreateLeague.tsx"
  "client/src/pages/LeagueDetail.tsx"
  "client/src/pages/LeagueList.tsx"
  "client/src/pages/RosterTest.tsx"
  "client/src/pages/Draft.tsx"
  "client/src/pages/Lineup.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Replace window.location.href = getLoginUrl(); with safe version
    sed -i 's/window\.location\.href = getLoginUrl();/const loginUrl = getLoginUrl(); if (loginUrl) window.location.href = loginUrl; else window.location.href = "\/login";/g' "$file"
    echo "Fixed: $file"
  fi
done

echo "All files fixed!"
