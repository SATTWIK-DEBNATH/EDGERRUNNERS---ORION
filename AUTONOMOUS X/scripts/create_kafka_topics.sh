#!/usr/bin/env bash
set -eo pipefail

BOOTSTRAP_SERVER="${KAFKA_BOOTSTRAP_SERVER:-localhost:9092}"

echo "================================================================"
echo "Creating AUTONOMOUS X v3.0 Kafka Topics"
echo "Target Broker: $BOOTSTRAP_SERVER"
echo "================================================================"

# Array of topics and retention in ms: topic:retention_ms:partitions
declare -a TOPICS=(
  "ax.orders.new:604800000:3"
  "ax.orders.updated:604800000:3"
  "ax.vehicles.position:3600000:6"
  "ax.vehicles.status:604800000:3"
  "ax.warehouses.status:604800000:3"
  "ax.inventory.updated:604800000:3"
  "ax.incidents.created:604800000:3"
  "ax.incidents.correlated:604800000:3"
  "ax.incidents.resolved:604800000:3"
  "ax.routes.assigned:604800000:3"
  "ax.routes.updated:604800000:3"
  "ax.deliveries.completed:604800000:3"
  "ax.agents.decisions:604800000:3"
  "ax.forecasts.updated:604800000:3"
  "ax.h3.heatmaps:3600000:3"
  "ax.metrics.snapshots:86400000:3"
  "ax.dlq:2592000000:3"
)

# Determine command to execute kafka-topics
KAFKA_TOPICS_CMD="kafka-topics"
if ! command -v kafka-topics &> /dev/null; then
  if command -v kafka-topics.sh &> /dev/null; then
    KAFKA_TOPICS_CMD="kafka-topics.sh"
  elif command -v /bin/kafka-topics &> /dev/null; then
    KAFKA_TOPICS_CMD="/bin/kafka-topics"
  elif command -v /usr/bin/kafka-topics &> /dev/null; then
    KAFKA_TOPICS_CMD="/usr/bin/kafka-topics"
  else
    # Check if docker is available to run inside ax-kafka container
    if command -v docker &> /dev/null; then
      KAFKA_TOPICS_CMD="docker exec -i ax-kafka kafka-topics"
      BOOTSTRAP_SERVER="localhost:9092"
    else
      echo "Warning: kafka-topics / kafka-topics.sh not directly in PATH."
      echo "Assuming kafka-topics.sh for container execution."
      KAFKA_TOPICS_CMD="kafka-topics.sh"
    fi
  fi
fi

for entry in "${TOPICS[@]}"; do
  IFS=':' read -r topic retention partitions <<< "$entry"
  echo "Ensuring topic: $topic (retention.ms=$retention, partitions=$partitions)"
  $KAFKA_TOPICS_CMD --bootstrap-server "$BOOTSTRAP_SERVER" \
    --create \
    --if-not-exists \
    --topic "$topic" \
    --partitions "$partitions" \
    --replication-factor 1 \
    --config retention.ms="$retention" || true
done

echo "================================================================"
echo "Topics listing:"
$KAFKA_TOPICS_CMD --bootstrap-server "$BOOTSTRAP_SERVER" --list || true
echo "Kafka topic creation completed successfully."
