const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

const dist = path.resolve(__dirname, 'dist');

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin;

module.exports = {
  mode: 'production',
  entry: './src/index.ts',
  output: {
    path: dist,
    filename: 'bundle.js'
  },
  devtool: 'source-map',
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/index.html'
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
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.wasm']
  },
  experiments: {
    syncWebAssembly: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              presets: [
                [
                  '@babel/env',
                  {
                    targets: {
                      browsers: [
                        'edge >= 17',
                        'ff >= 61',
                        'chrome >= 63',
                        'safari >= 11.1'
                      ]
                    },
                    useBuiltIns: 'usage',
                    modules: false,
                    corejs: 3
                  }
                ]
              ],
              plugins: [
                '@babel/plugin-transform-typescript',
                '@babel/plugin-syntax-dynamic-import'
              ]
            }
          }
        ]
      }
    ]
  }
};
