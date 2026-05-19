package com.example.backend.service;

import com.example.backend.model.UserDetails;
import com.example.backend.repository.UserDetailsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserDetailsService {

    private final UserDetailsRepository repository;

    @Autowired
    public UserDetailsService(UserDetailsRepository repository) {
        this.repository = repository;
    }

    public UserDetails addUser(UserDetails user) {
        return repository.save(user);
    }

    public List<UserDetails> getAllUsers() {
        return repository.findAll();
    }

    public void deleteUser(Long id) {
        repository.deleteById(id);
    }
}
