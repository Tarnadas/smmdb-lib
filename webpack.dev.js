const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const WasmPackPlugin = require('@wasm-tool/wasm-pack-plugin');
const webpack = require('webpack');

const dist = path.resolve(__dirname, 'dist');

module.exports = {
  mode: 'development',
  entry: path.join(__dirname, 'js/index.js'),
  output: {
    path: dist,
    filename: 'bundle.js'
  },
  devtool: 'inline-source-map',
  devServer: {
    contentBase: dist,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html'
    }),
    new WasmPackPlugin({
      crateDirectory: '.'
    }),
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development'
    })
  ],
  resolve: {
    extensions: [ '.ts', '.tsx', '.js', '.jsx', '.json', '.wasm' ]
  },
  watchOptions: {
    ignored: [
      /target\/.*/
    ]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            query: {
              babelrc: false,
              presets: [
                ['@babel/env', {
                  targets: {
                    browsers: [
                      'edge >= 17',
                      'ff >= 61',
                      'chrome >= 63',
                      'safari >= 11.1'
                    ]
                  },
                  useBuiltIns: 'usage',
                  modules: false
                }]
              ],
              plugins: [
                [ '@babel/plugin-transform-typescript', {
                  isTSX: true,
                  jsxPragma: 'h'
                }],
                '@babel/plugin-syntax-dynamic-import'
              ]
            }
          }
        ]
      }
    ]
  }
};
