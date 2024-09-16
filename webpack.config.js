const path = require('path');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  entry: './src/webview/index.jsx',
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'bundle.js',
    publicPath: '/', // Important for HMR
  },
  mode: isDevelopment ? 'development' : 'production',
  devtool: 'source-map', // Helpful for debugging
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'out'),
    },
    hot: true,
    port: 3000, // You can choose any port
    headers: {
      'Access-Control-Allow-Origin': '*', // Necessary for webview to load resources
    },
    allowedHosts: 'all', // Allows requests from webview
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            // Enable React Refresh in development
            plugins: [
              isDevelopment && require.resolve('react-refresh/babel'),
            ].filter(Boolean),
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
    ],
  },
  plugins: [
    // Enable React Refresh plugin in development
    isDevelopment && new ReactRefreshWebpackPlugin(),
  ].filter(Boolean),
};