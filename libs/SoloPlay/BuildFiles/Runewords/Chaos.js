const Chaos = [
	"[name] == FalRune",
	"[name] == OhmRune",
	"[name] == UmRune",
	"[name] == suwayyah && [quality] >= normal && [quality] <= superior # ([assassinskills]+[shadowdisciplinesskilltab]+[skillvenom]+[skilldeathsentry]+[skillfade]+[skillshadowmaster]) >= 1 && [sockets] == 3 # [maxquantity] == 1",
	"[name] == suwayyah && [quality] == normal # ([assassinskills]+[shadowdisciplinesskilltab]+[skillvenom]+[skilldeathsentry]+[skillfade]+[skillshadowmaster]) >= 1 && [sockets] == 0 # [maxquantity] == 1",
];
NTIP.arrayLooping(Chaos);

Config.Runewords.push([Runeword.Chaos, "suwayyah"]);

Config.KeepRunewords.push("[type] == assassinclaw # [plusskillwhirlwind] == 1");