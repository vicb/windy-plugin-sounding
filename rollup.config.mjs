import alias from '@rollup/plugin-alias';
import babel from "@rollup/plugin-babel";
import cjs from "@rollup/plugin-commonjs";
import pkg from "./package.json" assert {type: 'json'};
import replace from "@rollup/plugin-replace";
import resolve from "@rollup/plugin-node-resolve";
import serve from "rollup-plugin-serve";
import stripCode from "rollup-plugin-strip-code";
// import terser from '@rollup/plugin-terser';
import fs from 'node:fs';
import path from 'node:path';
import { buildPluginsHtml, buildPluginsCss, transformToPlugin } from './rollup-plugins.mjs';
import terser from '@rollup/plugin-terser';

const prod = !process.env.ROLLUP_WATCH;

const meta = {
    name: pkg.name,
    version: pkg.version,
    author: pkg.author,
    repository: {
      type: pkg.repository.type,
      url: pkg.repository.url,
    },
    description: pkg.description,
    displayName: "Better Sounding",
    hook: "contextmenu",
    className: "plugin-lhpane",
    classNameMobile: "window",
    exclusive: "lhpane",
    attachPointMobile: "#plugins",
};

export default {
  input: "src/plugin.js",
  output: {
    file: prod ? "dist/plugin.js" : "dev/plugin.js",
    name: "plugin.js",
    format: "es",
  },
  external: moduleId => moduleId.startsWith('@windy/') || moduleId.startsWith('@plugins/'),
  plugins: [
    replace({
      values: {
        "process.env.NODE_ENV": JSON.stringify(prod ? "production" : "development"),
      },
      preventAssignment: true,
    }),
    prod && stripCode({
      start_comment: 'strip-from-prod',
      end_comment: 'end-strip-from-prod'
    }),
            buildPluginsHtml(),
            buildPluginsCss(),
    resolve(),
    alias({
      entries: {
        react: path.resolve('node_modules/preact/compat/src/index.js'),
        'react-dom': path.resolve('node_modules/preact/compat/src/index.js'),
      }
    }),    
    cjs({
      include: "node_modules/**",
    }),
    !prod &&
      serve({
        contentBase: "dev",
        port: 9999,
        https: {
          key: fs.readFileSync('key.pem'),
          cert: fs.readFileSync('certificate.pem'),
        }
      }),
      transformToPlugin(meta),
    babel({
      presets: [
        [
          "@babel/preset-env",
          {
            targets: "last 2 versions and not ie < 20 and > .5%",
          },
        ],
      ],
      plugins: [["@babel/plugin-transform-react-jsx", { pragma: "h" }]],
      babelHelpers: 'bundled',
    }),
    prod && terser({ output: { comments: false } }),
  ],
};
