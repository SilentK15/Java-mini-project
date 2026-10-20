import java.net.HttpURLConnection;
import java.net.URI;

public final class HealthProbe {
    private HealthProbe() {}

    public static void main(String[] args) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) URI.create("http://127.0.0.1:8080/api/health/ready").toURL().openConnection();
            connection.setConnectTimeout(2_000);
            connection.setReadTimeout(2_000);
            connection.setRequestMethod("GET");
            if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) System.exit(1);
        } catch (Exception exception) {
            System.exit(1);
        } finally {
            if (connection != null) connection.disconnect();
        }
    }
}
