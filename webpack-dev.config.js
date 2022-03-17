const path = require("path");
const Webpack = require("webpack");
const { merge } = require("webpack-merge");
const common = require("./webpack-base");
const ErudaWebpackPlugin = require("eruda-webpack-plugin");

module.exports = merge(common, {
	mode: "development",
	devtool: "source-map",
	output: {
		path: __dirname + "/bin",
		filename: "js/bundle.js",
	},

	devServer: {
		open: true,
		contentBase: path.join(__dirname, "bin"),
		historyApiFallback: true,
		host: "0.0.0.0",
		useLocalIp: true,
		hot: true,
	},

	plugins: [
		new ErudaWebpackPlugin({
			entry: /js\/bundle\.js$/,
		}),
		new Webpack.HotModuleReplacementPlugin(),
	],
});