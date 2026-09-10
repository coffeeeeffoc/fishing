import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config({ignores:['dist/**','node_modules/**','artifacts/**']},js.configs.recommended,...tseslint.configs.recommended,{files:['**/*.{js,mjs,ts,tsx}'],languageOptions:{globals:{console:'readonly',process:'readonly',setTimeout:'readonly',URL:'readonly'}},rules:{'@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_'}]}});
