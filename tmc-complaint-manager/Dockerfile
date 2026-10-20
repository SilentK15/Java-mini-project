FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
COPY src src
COPY docker/HealthProbe.java docker/
RUN chmod +x mvnw && ./mvnw -B package
RUN mkdir -p /workspace/health-check && javac -d /workspace/health-check docker/HealthProbe.java

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 10001 --create-home appuser && mkdir -p /app/uploads && chown -R appuser:appuser /app
COPY --from=build --chown=appuser:appuser /workspace/target/complaint-manager-0.0.1-SNAPSHOT.jar /app/app.jar
COPY --from=build --chown=appuser:appuser /workspace/health-check/HealthProbe.class /app/HealthProbe.class
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 CMD ["java", "-cp", "/app", "HealthProbe"]
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
