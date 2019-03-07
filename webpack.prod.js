const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const WasmPackPlugin = require('@wasm-tool/wasm-pack-plugin');
const webpack = require('webpack');

const dist = path.resolve(__dirname, 'dist');

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  mode: 'production',
  entry: './js/index.js',
  output: {
    path: dist,
    filename: 'bundle.js'
  },
  devtool: 'source-map',
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html'
    }),
    new WasmPackPlugin({
      crateDirectory: '.',
      forceMode: 'production'
    }),
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production'
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: path.join(__dirname, 'bundle-report.html'),
      openAnalyzer: false,
      generateStatsFile: true,
      statsFilename: path.join(__dirname, 'stats.json')
    })
  ],
  resolve: {
    extensions: [ '.ts', '.tsx', '.js', '.jsx', '.json', '.wasm' ]
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
                  isTSX: true
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
