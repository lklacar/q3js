ALTER TABLE servers
    ADD COLUMN transport TEXT NOT NULL DEFAULT 'websocket';

ALTER TABLE servers
    ADD CONSTRAINT servers_transport_check
        CHECK (transport IN ('websocket', 'webtransport'));
