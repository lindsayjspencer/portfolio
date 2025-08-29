/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
module.exports = {
	plugins: ['prettier-plugin-tailwindcss'],
	useTabs: true,
	tabWidth: 4,
	singleQuote: true,
	jsxSingleQuote: false,
	trailingComma: 'all',
	printWidth: 120,
};
