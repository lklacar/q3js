FROM maven:3.9.16-eclipse-temurin-17 AS dependencies

WORKDIR /workspace/master

COPY master/pom.xml ./
RUN mvn --batch-mode dependency:go-offline -DskipTests

FROM dependencies AS builder

COPY master/src src
RUN mvn --batch-mode package -DskipTests

FROM eclipse-temurin:17-jre-jammy AS runtime

RUN groupadd --gid 10001 q3js \
    && useradd --uid 10001 --gid q3js --no-create-home --home-dir /opt/q3js q3js

WORKDIR /opt/q3js/master

COPY --from=builder --chown=q3js:q3js /workspace/master/target/quarkus-app/ ./

ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0"

EXPOSE 8080
USER q3js

ENTRYPOINT ["java", "-jar", "quarkus-run.jar"]
