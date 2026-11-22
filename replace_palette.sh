#!/bin/bash
# Replace old palette with new base/accent palette across all src files

SRC="src"

replace_in_all() {
  local search=$1
  local rep=$2
  grep -rl "$search" "$SRC" | xargs -r sed -i "s|$search|$rep|g"
}

# Backgrounds
replace_in_all 'bg-primary-900' 'bg-base-900'
replace_in_all 'bg-primary-800' 'bg-base-800'
replace_in_all 'bg-primary-700' 'bg-base-700'
replace_in_all 'bg-primary-600' 'bg-base-600'
replace_in_all 'bg-primary-100' 'bg-base-100'
replace_in_all 'bg-slate-900' 'bg-base-900'
replace_in_all 'bg-slate-800' 'bg-base-800'
replace_in_all 'bg-slate-700' 'bg-base-700'
replace_in_all 'bg-slate-600' 'bg-base-600'
replace_in_all 'bg-slate-800/80' 'bg-base-800'
replace_in_all 'bg-slate-900/60' 'bg-base-900'
replace_in_all 'bg-slate-800/40' 'bg-base-800'
replace_in_all 'bg-slate-800/95' 'bg-base-800'
replace_in_all 'bg-slate-700/60' 'bg-base-700'
replace_in_all 'bg-slate-700/40' 'bg-base-700'
replace_in_all 'bg-slate-700/70' 'bg-base-700'

# Borders
replace_in_all 'border-primary-700' 'border-base-600'
replace_in_all 'border-primary-600' 'border-base-600'
replace_in_all 'border-primary-500' 'border-base-500'
replace_in_all 'border-primary-800' 'border-base-800'
replace_in_all 'border-slate-700' 'border-base-600'
replace_in_all 'border-slate-600' 'border-base-600'
replace_in_all 'border-slate-800' 'border-base-800'

# Text colors
replace_in_all 'text-primary-100' 'text-base-100'
replace_in_all 'text-primary-200' 'text-base-200'
replace_in_all 'text-primary-300' 'text-base-300'
replace_in_all 'text-primary-400' 'text-base-400'
replace_in_all 'text-primary-500' 'text-base-500'
replace_in_all 'text-primary-600' 'text-base-600'
replace_in_all 'text-primary-700' 'text-base-700'
replace_in_all 'text-slate-100' 'text-base-100'
replace_in_all 'text-slate-200' 'text-base-200'
replace_in_all 'text-slate-300' 'text-base-300'
replace_in_all 'text-slate-400' 'text-base-400'
replace_in_all 'text-slate-500' 'text-base-500'
replace_in_all 'text-slate-600' 'text-base-600'
replace_in_all 'text-slate-700' 'text-base-700'

# sky -> accent
replace_in_all 'bg-sky-600' 'bg-accent'
replace_in_all 'bg-sky-500' 'bg-accent-light'
replace_in_all 'bg-sky-700' 'bg-accent-dark'
replace_in_all 'bg-sky-400' 'bg-accent-light'
replace_in_all 'hover:bg-sky-500' 'hover:bg-accent-light'
replace_in_all 'hover:bg-sky-600' 'hover:bg-accent'
replace_in_all 'hover:bg-sky-900' 'hover:bg-accent-dark'
replace_in_all 'text-sky-400' 'text-accent-light'
replace_in_all 'text-sky-300' 'text-accent-light'
replace_in_all 'text-sky-200' 'text-accent-light'
replace_in_all 'text-sky-500' 'text-accent'
replace_in_all 'border-sky-500' 'border-accent'
replace_in_all 'border-sky-600' 'border-accent'
replace_in_all 'border-sky-700' 'border-accent-dark'
replace_in_all 'focus:ring-sky-500' 'focus:ring-accent'
replace_in_all 'focus:border-sky-500' 'focus:border-accent'
replace_in_all 'ring-sky-500' 'ring-accent'

# hover states
replace_in_all 'hover:bg-primary-700' 'hover:bg-base-700'
replace_in_all 'hover:bg-primary-600' 'hover:bg-base-600'
replace_in_all 'hover:bg-slate-700' 'hover:bg-base-700'
replace_in_all 'hover:bg-slate-600' 'hover:bg-base-600'
replace_in_all 'hover:border-sky-700' 'hover:border-accent'
replace_in_all 'hover:text-sky-300' 'hover:text-accent-light'
replace_in_all 'hover:text-sky-400' 'hover:text-accent-light'
replace_in_all 'hover:text-primary-200' 'hover:text-base-200'
replace_in_all 'hover:text-primary-300' 'hover:text-base-300'
replace_in_all 'hover:text-slate-200' 'hover:text-base-200'
replace_in_all 'hover:text-slate-100' 'hover:text-base-100'
replace_in_all 'hover:text-slate-300' 'hover:text-base-300'

# placeholders
replace_in_all 'placeholder-primary-500' 'placeholder-base-500'
replace_in_all 'placeholder-slate-500' 'placeholder-base-500'

# sky misc
replace_in_all 'bg-sky-950' 'bg-base-950'
replace_in_all 'bg-sky-950/60' 'bg-accent-subtle'
replace_in_all 'bg-sky-500/10' 'bg-accent-subtle'
replace_in_all 'bg-sky-500/20' 'bg-accent/20'

echo "Done."
