module.exports = {
	bundles: {
		clientJavaScript: {
			main: {
				file: '/js/meadowlark.min.f50b3fef.js',
				location: 'head',
				contents: [
					'/js/contact.js',
					'/js/cart.js'
				]
			}
		},
		clientCss: {
			main: {
				file: '/css/meadowlark.min.86132834.css',
				contents: [
					'/css/main.css',
					'/css/cart.css'
				]
			}
		}
	}
}