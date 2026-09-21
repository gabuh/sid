package br.edu.ifsp.sid.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import br.edu.ifsp.sid.dto.ImageResponse;
import br.edu.ifsp.sid.service.S3Service;

@RestController
@RequestMapping("/bucket")
public class S3Controller {
    
    private final S3Service s3Service;

    public S3Controller(S3Service s3Service) {
        this.s3Service = s3Service;
    }

    @GetMapping
    public ResponseEntity<Map<String, List<ImageResponse>>> listAllImages(){
        var names = s3Service.listAllImagesWithPresignedUrls();
        return ResponseEntity.status(HttpStatus.OK).body(names);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> updateImgVariant(
        @RequestPart("image") MultipartFile image
    ){
        String imgUrl;

            try {
                imgUrl = s3Service.uploadImage(image);
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.FAILED_DEPENDENCY).body(null);
            }
            return ResponseEntity.status(HttpStatus.OK).body(imgUrl); 
        
        
    }


}
