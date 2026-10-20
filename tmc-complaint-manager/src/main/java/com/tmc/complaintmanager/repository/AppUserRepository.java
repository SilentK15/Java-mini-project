package com.tmc.complaintmanager.repository;

import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;
import java.util.Collection;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    List<AppUser> findAllByRoleOrderByNameAsc(UserRole role);
    List<AppUser> findAllByRoleInOrderByNameAsc(Collection<UserRole> roles);
}
