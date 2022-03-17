const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
	entry: {
		app: "./src/js/index.js",
	},

	resolve: {
		extensions: [".ts", ".tsx", ".js", ".json"],
		alias: {
			root: path.resolve(__dirname, "./src"),
		},
	},

	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: [
					"babel-loader",
					{
						loader: "ts-loader",
						options: {
							transpileOnly: true,
							happyPackMode: true,
						},
					},
				],
			},
			{
				test: /\.scss/,
				use: [
					{
						loader: "style-loader",
					},
					{
						loader: "css-loader",
						options: {
							url: false,
						},
					},
					{
						loader: "sass-loader",
					},
				],
			},
		],
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: "index.html",
			title: "Zombies Party",
			baseTag: '<base href="" target="_blank" host="http://lobby-egame-ss.sgplay.biz">',
		}),
	],
};
