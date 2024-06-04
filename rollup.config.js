import alias from "@rollup/plugin-alias";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import replace from "@rollup/plugin-replace";
import serve from "rollup-plugin-serve";
import rollupSvelte from "rollup-plugin-svelte";
import rollupSwc from "rollup-plugin-swc3";
import rollupCleanup from "rollup-plugin-cleanup";
import json from "@rollup/plugin-json";

import less from "rollup-plugin-less";

import sveltePreprocess from "svelte-preprocess";

import path from "node:path";

import {
  transformCodeToESMPlugin,
  keyPEM,
  certificatePEM,
} from "@windycom/plugin-devtools";

const useSourceMaps = false;

const prod = !process.env.ROLLUP_WATCH;

const { input, out } = {
  input: "src/plugin.svelte",
  out: "plugin",
};

export default {
  input,
  output: [
    {
      file: `dist/${out}.js`,
      format: "module",
      sourcemap: true,
    },
    {
      file: `dist/${out}.min.js`,
      format: "module",
      plugins: [
        rollupCleanup({ comments: "none", extensions: ["ts"] }),
        terser(),
      ],
    },
  ],

  onwarn: () => {
    /* We disable all warning messages */
  },
  external: (id) => id.startsWith("@windy/"),
  watch: {
    include: ["src/**", "src/styles.less"],
    exclude: "node_modules/**",
    clearScreen: false,
  },
  plugins: [
    json(),
    less({ insert: true }),
    replace({
      values: {
        "process.env.NODE_ENV": JSON.stringify(
          prod ? "production" : "development",
        ),
      },
      preventAssignment: true,
    }),
    typescript({
      sourceMap: useSourceMaps,
      inlineSources: false,
    }),
    rollupSwc({
      include: ["**/*.ts", "**/*.tsx", "**/*.svelte"],
      sourceMaps: useSourceMaps,
    }),
    rollupSvelte({
      emitCss: false,
      preprocess: {
        // style: less({
        //     sourceMap: false,
        //     math: 'always',
        // }),
        script: (data) => {
          const preprocessed = sveltePreprocess({ sourceMap: useSourceMaps });
          return preprocessed.script(data);
        },
      },
    }),

    resolve({
      browser: true,
      mainFields: ["module", "jsnext:main", "main"],
      preferBuiltins: false,
      dedupe: ["svelte"],
    }),
    alias({
      entries: {
        react: path.resolve("node_modules/preact/compat/src/index.js"),
        "react-dom": path.resolve("node_modules/preact/compat/src/index.js"),
      },
    }),
    commonjs(),
    transformCodeToESMPlugin(),
    process.env.SERVE !== "false" &&
      serve({
        contentBase: "dist",
        host: "localhost",
        port: 9999,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        https: {
          key: keyPEM,
          cert: certificatePEM,
        },
      }),
  ],
};
