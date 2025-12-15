package com.Smart_mirror.service;

import org.bytedeco.javacpp.BytePointer;
import org.bytedeco.opencv.opencv_core.Mat;
import org.bytedeco.opencv.opencv_core.Rect;
import org.bytedeco.opencv.opencv_core.RectVector;
import org.bytedeco.opencv.opencv_core.Scalar;
import org.bytedeco.opencv.global.opencv_imgcodecs;
import org.bytedeco.opencv.global.opencv_imgproc;
import org.bytedeco.opencv.opencv_objdetect.CascadeClassifier;
import org.springframework.stereotype.Service;

import java.io.File;
import java.net.URL;

import static org.bytedeco.opencv.global.opencv_imgcodecs.IMREAD_COLOR;
import static org.bytedeco.opencv.global.opencv_imgcodecs.imdecode;

@Service
public class FaceRecognitionService {

    private CascadeClassifier faceDetector;

    public FaceRecognitionService() {
        // Load Haarcascade from resources
        try {
            URL resource = getClass().getClassLoader().getResource("haarcascade_frontalface_alt.xml");
            if (resource == null) {
                throw new RuntimeException("Could not find haarcascade_frontalface_alt.xml in resources!");
            }
            faceDetector = new CascadeClassifier(new File(resource.toURI()).getAbsolutePath());
        } catch (Exception e) {
            throw new RuntimeException("Failed to load Haarcascade classifier", e);
        }
    }

    public int detectFaces(byte[] imageBytes) {
        Mat img = imdecode(new Mat(new BytePointer(imageBytes)), IMREAD_COLOR);
        RectVector faces = new RectVector();

        faceDetector.detectMultiScale(img, faces);

        // (Optional) draw rectangles around faces
        for (int i = 0; i < faces.size(); i++) {
            Rect rect = faces.get(i);
            opencv_imgproc.rectangle(img, rect, new Scalar(0, 255, 0, 0));
        }

        return (int) faces.size();
    }
}
