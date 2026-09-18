package br.edu.ifsp.sid.service;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import br.edu.ifsp.sid.dto.ImageResponse;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

@Service
public class S3Service {
    
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    
    @Value("${cloud.aws.s3.bucket-name}")
    private String bucketName;


    public S3Service(S3Client s3Client, S3Presigner s3Presigner) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
    }


    public List<String> listBuckets () {
        var response = s3Client.listBuckets();
        var buckets = response.buckets();

        var bucketsName = buckets.stream().map((b) -> b.name()).toList();
        return bucketsName;        
    }


    public String uploadImage(MultipartFile image) throws IOException {
        var contentType = image.getContentType();
        var imageKey = "imagens-originais/" + UUID.randomUUID().toString() + contentType.replace("image/",".") ;
        
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
        .bucket(bucketName)
        .key(imageKey)
        .contentType(contentType)
        .build();

        s3Client.putObject(putObjectRequest, 
            RequestBody.fromInputStream(image.getInputStream(), image.getSize())
        );

        return s3Client.utilities().getUrl(b -> b.bucket(bucketName).key(imageKey)).toExternalForm();

    }

    public String generatePresignedUrl(String key) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(60)) // URL valid for 60 minutes
                .getObjectRequest(getObjectRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toExternalForm();
    }


    public List<ImageResponse> listAllImagesWithPresignedUrls() {
        ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                .bucket(bucketName)
                .prefix("imagens-originais/")
                .build();

        return s3Client.listObjectsV2(listRequest).contents().stream()
                .map(s3Object -> new ImageResponse(
                        s3Object.key(),
                        generatePresignedUrl(s3Object.key())
                ))
                .toList();
    }

}
