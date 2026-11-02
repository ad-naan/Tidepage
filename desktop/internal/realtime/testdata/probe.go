package main
import(
 "context"
 "fmt"
 "os"
 "time"
 "tidepage.local/companion/internal/protocol"
 "tidepage.local/companion/internal/realtime"
)
func main(){ctx,cancel:=context.WithTimeout(context.Background(),10*time.Second);defer cancel();events:=make(chan realtime.Event,8);client:=realtime.New(func(e realtime.Event){select{case events<-e:default:}})
 client.Publish(protocol.Presence{Status:"online",Apps:[]protocol.App{{ID:"editor",Name:"Integration Editor"}},Track:&protocol.Track{Title:"Integration Song",Artist:"Test Artist",Player:"Test Player"}})
 go client.Run(ctx,os.Getenv("PROBE_REALTIME_URL"),os.Getenv("PROBE_REALTIME_TOKEN"));count:=0
 for{select{case <-ctx.Done():fmt.Println("timeout");os.Exit(1);case e:=<-events:if !e.SyncedAt.IsZero(){count++;if count==1{client.Publish(protocol.Empty(true))}else{fmt.Println("ok");return}}}}
}
