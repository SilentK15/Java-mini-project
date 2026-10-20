package com.tmc.complaintmanager;

import com.tmc.complaintmanager.controller.HealthController;
import org.junit.jupiter.api.Test;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class HealthControllerTests {
    @Test
    void livenessDoesNotDependOnDatabaseAvailability() {
        HealthController controller = new HealthController(mock(DataSource.class));

        assertEquals("UP", controller.live().status());
    }

    @Test
    void readinessReturnsUpWhenDatabaseConnectionIsValidAndClosesIt() throws Exception {
        DataSource source = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        when(source.getConnection()).thenReturn(connection);
        when(connection.isValid(2)).thenReturn(true);

        var response = new HealthController(source).ready();

        assertEquals(200, response.getStatusCode().value());
        assertEquals("UP", response.getBody().status());
        verify(connection).close();
    }

    @Test
    void readinessReturnsGenericDownStatusWhenDatabaseIsUnavailable() throws Exception {
        DataSource source = mock(DataSource.class);
        when(source.getConnection()).thenThrow(new SQLException("private driver details"));

        var response = new HealthController(source).ready();

        assertEquals(503, response.getStatusCode().value());
        assertEquals("DOWN", response.getBody().status());
        verify(source).getConnection();
    }
}
