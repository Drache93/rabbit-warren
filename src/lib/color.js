const t = process.stdout.isTTY

const c = (code) => (t ? (s) => `\x1b[${code}m${s}\x1b[0m` : (s) => s)

export const bold = c('1')
export const dim = c('2')
export const cyan = c('36')
export const yellow = c('33')
export const green = c('32')
export const red = c('31')
export const magenta = c('35')
export const gray = c('90')
