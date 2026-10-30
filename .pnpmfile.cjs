// .pnpmfile.cjs
function readPackage(pkg, context) {
	if (pkg.dependencies && pkg.dependencies['discord-voip']) {
		pkg.dependencies['discord-voip'] = 'npm:@discordjs/voice@^0.19.2'
	}
	return pkg
}

module.exports = {
	hooks: {
		readPackage,
	},
}
