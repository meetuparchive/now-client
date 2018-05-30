const path = require('path');

module.exports = {
  mode: 'production',
  entry: path.join(__dirname, 'src/index.js'),
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build'),
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
  },
};
