<?php
session_start();
header('Content-Type: application/json');

if (isset($_SESSION['user_id']) && isset($_SESSION['role'])) {
    $role = $_SESSION['role'];
    $subRole = $_SESSION['sub_role'] ?? '';

    $map = [
        'admin' => 'admindash.html',
        'user' => [
            'donor_recipient' => 'donor_recipient_dash.html',
            'doctor'          => 'doctor_dash.html',
            'lab_technician'  => 'lab_technician_dash.html',
            'delivery_staff'  => 'delivery_staff_dash.html'
        ],
        'blood_bank' => [
            'blood_bank'      => 'bankdash.html',
            'hospital'        => 'hospital_dash.html',
            'medical_college' => 'medical_college_dash.html'
        ]
    ];

    if ($role === 'admin') {
        $redirect = 'admindash.html';
    } elseif ($role === 'user' && isset($map['user'][$subRole])) {
        $redirect = $map['user'][$subRole];
    } elseif ($role === 'blood_bank' && isset($map['blood_bank'][$subRole])) {
        $redirect = $map['blood_bank'][$subRole];
    } else {
        $redirect = 'login.html';
    }

    echo json_encode([
        'logged_in' => true,
        'redirect'  => $redirect,
        'user_id'   => (int)$_SESSION['user_id'],
        'user_name' => $_SESSION['user_name'] ?? '',
    ]);
} else {
    echo json_encode(['logged_in' => false]);
}
