const autoprefixer = require("autoprefixer");
const postcssNested = require('postcss-nested');
const postCssPresetEnv = require('postcss-preset-env');

const config = {
  plugins: [
    //Some plugins, like tailwindcss/nesting, need to run before Tailwind,
    //But others, like autoprefixer, need to run after,
    // autoprefixer,
    postcssNested,
  ],
};

module.exports = config;
