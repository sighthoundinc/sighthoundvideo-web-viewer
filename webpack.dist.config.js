/******************************************************************************
  *
   *
 * Copyright 2013-2022 Sighthound, Inc.
 *
 * Licensed under the GNU GPLv3 license found at
 * https://www.gnu.org/licenses/gpl-3.0.txt
 *
 * Alternative licensing available from Sighthound, Inc.
 * by emailing opensource@sighthound.com
 *
 * This file is part of the Sighthound Video project which can be found at
 * https://github.com/sighthoundinc/SighthoundVideo
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; using version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02111, USA.
 *
  *
*******************************************************************************/


const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const HtmlWebpackPluginConfig = new HtmlWebpackPlugin({
  template: './src/index.html',
  filename: 'index.html',
  inject: 'body'
});

const CopyWebpackPluginConfig = new CopyWebpackPlugin([
  { from: 'static' }
]);

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

module.exports = function(env){
  const distPath = (env && env.distPath) || 'dist';

  return {
    entry: './src/index.tsx',
    output: {
      path: path.resolve(distPath),
      filename: 'index_bundle.js'
    },
    devtool: false,
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.json']
    },
    module: {
      rules: [
        { test: /\.tsx?$/, use: ['babel-loader', 'ts-loader'], exclude: /node_modules/ },
        { test: /\.s?css$/, use: ['style-loader', 'css-loader', 'sass-loader'] }
      ]
    },
    externals: {
      'video.js': 'videojs'
    },
    optimization: {
      minimizer: [
        new UglifyJSPlugin({
          uglifyOptions: {
            comments: false,
            compress: {
              drop_console: true,
            }
          }
        })
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
          "process.env": {
              // This has effect on the react lib size
              "NODE_ENV": JSON.stringify("production")
          }
      }),
      new webpack.optimize.OccurrenceOrderPlugin(),
      new webpack.optimize.AggressiveMergingPlugin(),
      new webpack.LoaderOptionsPlugin({
          minimize: true,
          debug: false
      }),
      HtmlWebpackPluginConfig,
      CopyWebpackPluginConfig,
      // new BundleAnalyzerPlugin({reportFilename: '../BundleAnalyzerReport.html',analyzerMode: 'static'})
    ]
  }
}
