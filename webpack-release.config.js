const path = require("path");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserWebPackPlugin = require("terser-webpack-plugin");
const { HashedModuleIdsPlugin } = require("webpack");
const { merge } = require("webpack-merge");

const common = require("./webpack-base");


module.exports = merge(common, {
	mode: "production",
	output: {
		path: __dirname + "/bin",
		filename: "js/bundle.js",
	},

	optimization: {
		minimizer: [
			new TerserWebPackPlugin({
				parallel: 4,
				terserOptions: {
					compress: {
						drop_console: true,
						drop_debugger: true,
					},
				},
			}),
		],
		chunkIds: "named",
	},

	plugins: [
		new CleanWebpackPlugin({
            dangerouslyAllowCleanPatternsOutsideProject: true,
			// cleanOnceBeforeBuildPatterns: isReport ? [path.resolve("./dist")] : [],
			cleanOnceBeforeBuildPatterns: [path.resolve("./dist")],
            dry: false
		}),
		new BundleAnalyzerPlugin({
			analyzerMode: "disabled"
		}),
		new HtmlWebpackPlugin({
			template: "index.html",
			filename: `index.jsp`,
			javaPage: `<%@ page language="java" contentType="text/html; charset=utf-8" pageEncoding="utf-8"%>`,
			title: "${empty gameName?'Zombies Party':gameName}",
			baseTag: '<base href="${cdnUrl}" target="_blank" host="${baseUrl}" ws="${wsUrl}">',
		}),
		// new CopyWebpackPlugin({
		// 	patterns: [
		// 		{
		// 			from: path.join(__dirname, "/bin"),
		// 			globOptions: {
		// 				ignore: [
		// 					"**/libs/**",
		// 					"**/js/**",
		// 					"**/version.json",
		// 					"**/index.js",
		// 					"**/scene.json",
		// 					"**/unpack.json"
		// 				],
		// 			},
		// 			transform(content, path) {
		// 				if (path.includes("project.json")) {
		// 					return transform.addVerToProjectJson(content);
		// 				} else if (/\.png$|\.jpg$/.test(path)) {
		// 					return transform.tinifyImages(content, path);
		// 				} else if (/(\.(ls|lh|lmat|prefab|scene|ani|lang|fnt)$)/.test(path) && !/(\.ltcb\.ls$)/.test(path)) {
		// 					let isXml = /\.fnt$/.test(path);
		// 					return transform.uglifyTxtFile(content, isXml);
		// 				} else {
		// 					return content;
		// 				}
		// 			},
		// 		},
		// 	],
		// }),
		// new HashedModuleIdsPlugin({
		// 	hashDigest: "hex",
		// 	hashDigestLength: 8,
		// }),
	],
});
