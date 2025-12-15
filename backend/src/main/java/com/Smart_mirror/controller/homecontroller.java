package com.Smart_mirror.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/home")
public class homecontroller {
    @Autowired
    @GetMapping("/home")
    public String home() {
        return "Home Controller is working";
    }}
