tiddlywiki --load ./index.html --savewikifolder ./index


--save $:/plugins/kookma/shiraz .index-out.txt


tiddlywiki --load ./index.html --save "[!is[system]is[image]]" "[encodeuricomponent[]addprefix[tiddlers/]]"

tiddlywiki --load ./index.html --save "[plugin-type[plugin]] -[[$:/core]]" "[encodeuricomponent[]addprefix[tiddlers/]]"

