.PHONY: client master master-run server server-run website

client:
	@./game/build-client.sh

master:
	@./master/mvnw -f master/pom.xml package

master-run:
	@./master/mvnw -f master/pom.xml quarkus:dev

server:
	@./game/server/build.sh

server-run: server
	@./game/server/run.sh

website: client
	@pnpm --dir website build
