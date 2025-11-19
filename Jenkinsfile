pipeline {
    agent any

    environment {
        AWS_REGION = 'eu-north-1' // change to your region
        AWS_ECR_REPO_FRONTEND = 'three-tier-app-frontend'
        AWS_ECR_REPO_BACKEND = 'three-tier-app-backend'
        ECR_URI = '005743379632.dkr.ecr.eu-north-1.amazonaws.com'
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('Clone the Repo') {
            steps {
                git branch: 'main', url: 'https://github.com/saif-654/three-tier-app-jenkins-ECR.git'
            }
        }

        stage('Login to ECR') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'aws-ecr',
                    usernameVariable: 'AWS_ACCESS_KEY_ID',
                    passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                )]) {
                    sh '''
                        aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID
                        aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY
                        aws configure set default.region ${AWS_REGION}
                        aws ecr get-login-password | docker login --username AWS --password-stdin ${ECR_URI}
                    '''
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    env.FRONTEND_TAG = "${ECR_URI}/${AWS_ECR_REPO_FRONTEND}:${IMAGE_TAG}"
                    env.BACKEND_TAG = "${ECR_URI}/${AWS_ECR_REPO_BACKEND}:${IMAGE_TAG}"

                    sh "docker build -t ${env.BACKEND_TAG} ./backend"
                    sh "docker build -t ${env.FRONTEND_TAG} ./frontend"
                }
            }
        }

        stage('Push Images to ECR') {
            steps {
                sh """
                    docker push ${env.FRONTEND_TAG}
                    docker push ${env.BACKEND_TAG}
                """
            }
        }

        stage('Clean up after push') {
            steps {
                sh """
                    docker rmi -f ${env.FRONTEND_TAG} || true
                    docker rmi -f ${env.BACKEND_TAG} || true
                """
            }
        }

        stage('Update docker-compose.yml') {
            steps {
                sh """
                    sed -i 's|${ECR_URI}/.*three-tier-app-backend:.*|${env.BACKEND_TAG}|' docker-compose.yml
                    sed -i 's|${ECR_URI}/.*three-tier-app-frontend:.*|${env.FRONTEND_TAG}|' docker-compose.yml
                """
            }
        }

        stage('Run with Docker Compose') {
            steps {
                sh """
                    docker-compose down
                    docker-compose pull
                    docker-compose up -d
                """
            }
        }
    }

    post {
        success {
            echo "✅ Successfully deployed app using AWS ECR images."
        }
        failure {
            echo "❌ Deployment failed. Please check logs."
        }
    }
}

