.PHONY: client server server-run website

client:
	@./game/build-client.sh

server:
	@./game/server/build.sh

server-run: server
	@./game/server/run.sh

website: client
	@pnpm --dir website build
