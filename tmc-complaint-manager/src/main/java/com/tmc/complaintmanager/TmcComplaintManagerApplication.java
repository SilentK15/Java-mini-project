package com.tmc.complaintmanager;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TmcComplaintManagerApplication {

    public static void main(String[] args) {
        SpringApplication.run(TmcComplaintManagerApplication.class, args);
    }

}
