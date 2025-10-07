import globals from "globals";
import tseslint from "typescript-eslint";
// import json from "@eslint/json";
import { defineConfig } from "eslint/config";

export default defineConfig([
	{
		files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
		languageOptions: { globals: globals.node },
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
		},
	},
	tseslint.configs.recommended,
	// { files: ["**/*.json"], plugins: { json }, language: "json/json" },
]);
